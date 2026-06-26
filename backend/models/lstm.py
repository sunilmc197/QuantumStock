import logging
import numpy as np

logger = logging.getLogger("quantumstock.models.lstm")

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    logger.warning("PyTorch is not available. Using scikit-learn MLP Regressor fallback for LSTM predictions.")


if HAS_TORCH:
    class PyTorchLSTM(nn.Module):
        def __init__(self, input_dim=1, hidden_dim=64, num_layers=2, output_dim=1):
            super(PyTorchLSTM, self).__init__()
            self.hidden_dim = hidden_dim
            self.num_layers = num_layers
            self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True, dropout=0.2)
            self.fc = nn.Linear(hidden_dim, output_dim)

        def forward(self, x):
            # x shape: (batch_size, seq_len, input_dim)
            h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
            c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
            out, _ = self.lstm(x, (h0, c0))
            # Decode the hidden state of the last time step
            out = self.fc(out[:, -1, :])
            return out


class LSTMPredictor:
    """Wrapper that handles preprocessing, training, and predicting using PyTorch LSTM or fallback."""
    def __init__(self, seq_len=30, epochs=10, batch_size=32):
        self.seq_len = seq_len
        self.epochs = epochs
        self.batch_size = batch_size
        self.model = None
        self.fallback_model = None

    def _prepare_sequences(self, data: np.ndarray):
        X, y = [], []
        for i in range(len(data) - self.seq_len):
            X.append(data[i:(i + self.seq_len)])
            y.append(data[i + self.seq_len, 0]) # predict Close price
        return np.array(X), np.array(y)

    def fit(self, data: np.ndarray):
        # Data shape: (num_samples, num_features). First column is Close.
        if len(data) <= self.seq_len:
            raise ValueError(f"Not enough data to train LSTM. Need at least {self.seq_len + 5} rows, got {len(data)}.")

        X, y = self._prepare_sequences(data)
        
        # Ensure correct shapes
        # X: (samples, seq_len, features)
        # y: (samples,)
        
        if HAS_TORCH:
            try:
                # Convert to PyTorch Tensors
                x_tensor = torch.tensor(X, dtype=torch.float32)
                y_tensor = torch.tensor(y, dtype=torch.float32).unsqueeze(1)
                
                dataset = TensorDataset(x_tensor, y_tensor)
                loader = DataLoader(dataset, batch_size=self.batch_size, shuffle=True)
                
                input_dim = X.shape[2]
                self.model = PyTorchLSTM(input_dim=input_dim, hidden_dim=64, num_layers=2, output_dim=1)
                
                criterion = nn.MSELoss()
                optimizer = optim.Adam(self.model.parameters(), lr=0.005)
                
                self.model.train()
                for epoch in range(self.epochs):
                    for batch_x, batch_y in loader:
                        optimizer.zero_grad()
                        output = self.model(batch_x)
                        loss = criterion(output, batch_y)
                        loss.backward()
                        optimizer.step()
                return self
            except Exception as e:
                logger.error(f"PyTorch LSTM training failed ({e}). Falling back to MLP.")
        
        # Scikit-learn MLP Fallback
        from sklearn.neural_network import MLPRegressor
        self.fallback_model = MLPRegressor(
            hidden_layer_sizes=(64, 32),
            activation="relu",
            max_iter=100,
            random_state=42
        )
        # Reshape X to 2D for standard tabular MLP
        num_samples, seq_len, num_features = X.shape
        X_flat = X.reshape(num_samples, seq_len * num_features)
        self.fallback_model.fit(X_flat, y)
        return self

    def predict(self, last_sequence: np.ndarray) -> float:
        # last_sequence shape: (seq_len, num_features)
        if HAS_TORCH and self.model is not None:
            try:
                self.model.eval()
                # Add batch dimension: (1, seq_len, num_features)
                x_tensor = torch.tensor(last_sequence, dtype=torch.float32).unsqueeze(0)
                with torch.no_grad():
                    pred = self.model(x_tensor)
                return float(pred.squeeze().item())
            except Exception as e:
                logger.error(f"PyTorch LSTM predict failed ({e}). Attempting MLP fallback.")

        if self.fallback_model is not None:
            # Reshape sequence to 2D
            seq_flat = last_sequence.reshape(1, -1)
            pred = self.fallback_model.predict(seq_flat)
            return float(pred[0])
            
        raise RuntimeError("LSTM predictor has not been trained yet.")
